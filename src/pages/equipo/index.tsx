import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import { ArrowLeft, UserPlus, Loader2, Mail, Users, CheckCircle, Clock } from "lucide-react";

const RED = "#aa0000";

interface Member {
  email: string;
  name?: string;
  avatar?: string;
  teamRole: "owner" | "member";
  createdAt: string;
}

interface Pending {
  email: string;
  created_at: string;
  token: string;
}

export default function BrokerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") loadTeam();
  }, [status]);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams/invite");
      if (res.status === 403) { router.replace("/pricing"); return; }
      const data = await res.json();
      setMembers(data.members || []);
      setPending(data.pending || []);
    } catch { }
    setLoading(false);
  };

  const invite = async () => {
    if (!newEmail.includes("@")) { setInviteMsg("Email inválido"); return; }
    setInviting(true);
    setInviteMsg("");
    try {
      const res = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (data.ok) {
        setInviteMsg(`Invitación enviada a ${newEmail}`);
        setNewEmail("");
        loadTeam();
      } else {
        setInviteMsg(data.error || "Error al invitar");
      }
    } catch { setInviteMsg("Error de conexión"); }
    setInviting(false);
  };

  const activeMembers = members.filter(m => m.teamRole === "member");

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: RED }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Head><title>Mi Equipo — InstaCoach</title></Head>
      <div className="h-0.5 w-full" style={{ background: RED }} />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center gap-4">
          <button onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors mr-auto">
            <ArrowLeft size={13} /> Volver
          </button>
          <div className="font-black text-lg tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
            Insta<span style={{ color: RED }}>Coach</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "Georgia, serif" }}>Mi Equipo</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeMembers.length} agente{activeMembers.length !== 1 ? "s" : ""} activo{activeMembers.length !== 1 ? "s" : ""} · {10 - activeMembers.length} lugar{10 - activeMembers.length !== 1 ? "es" : ""} disponible{10 - activeMembers.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Invitar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={15} className="text-gray-400" />
            <span className="font-black text-sm text-gray-900">Invitar agente</span>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && invite()}
              placeholder="email@dominio.com"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
            />
            <button onClick={invite} disabled={inviting || !newEmail}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: RED }}>
              {inviting ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
              {inviting ? "Enviando..." : "Invitar"}
            </button>
          </div>
          {inviteMsg && (
            <p className={`text-xs mt-2 font-medium ${inviteMsg.includes("nviada") ? "text-green-600" : "text-red-500"}`}>
              {inviteMsg}
            </p>
          )}
        </div>

        {/* Miembros activos */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Users size={13} className="text-gray-400" />
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Agentes activos</span>
            <span className="ml-auto text-xs font-bold text-gray-300">{activeMembers.length}/10</span>
          </div>
          {activeMembers.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Todavía no tenés agentes en el equipo. Invitá al primero arriba.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeMembers.map(m => (
                <div key={m.email} className="flex items-center gap-3 px-5 py-3">
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-400">
                      {(m.name || m.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{m.name || m.email}</div>
                    {m.name && <div className="text-xs text-gray-400 truncate">{m.email}</div>}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <CheckCircle size={11} />
                    Activo
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invitaciones pendientes */}
        {pending.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Clock size={13} className="text-gray-400" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Invitaciones pendientes</span>
            </div>
            <div className="divide-y divide-gray-50">
              {pending.map(p => (
                <div key={p.token} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-400">
                    {p.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-600 truncate">{p.email}</div>
                    <div className="text-xs text-gray-400">
                      Invitado el {new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-amber-500">
                    <Clock size={11} />
                    Pendiente
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
