"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { authApi } from "@/lib/api/auth";

type Result = "verifying" | "ok" | "invalid" | "missing";

/**
 * Página PÚBLICA donde aterriza el link del correo de verificación
 * (/verify-email?token=...). Auto-submitea al montar. useSearchParams exige
 * Suspense en Next 16.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}

function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [result, setResult] = useState<Result>(token ? "verifying" : "missing");
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true; // un solo intento — el token es de un solo uso
    authApi
      .verifyEmail(token)
      .then(() => setResult("ok"))
      .catch(() => setResult("invalid"));
  }, [token]);

  const body = {
    verifying: {
      title: "Verificando tu correo…",
      text: "Un momento, estamos confirmando el enlace.",
      ok: false,
    },
    ok: {
      title: "¡Correo verificado!",
      text: "Tu correo quedó confirmado. Ya puedes usar tu cuenta con normalidad.",
      ok: true,
    },
    invalid: {
      title: "El enlace ya no es válido",
      text: "El enlace venció o ya se usó. Inicia sesión y solicita uno nuevo desde tu perfil.",
      ok: false,
    },
    missing: {
      title: "Falta el token del enlace",
      text: "Abre el enlace completo desde tu correo.",
      ok: false,
    },
  }[result];

  return (
    <div
      className="min-h-screen grid place-items-center bg-bg"
      style={{ padding: 24 }}
    >
      <div
        className="flex flex-col gap-[18px] bg-surface"
        style={{
          width: 380,
          padding: 32,
          borderRadius: 14,
          border: "1px solid var(--line)",
          boxShadow: "var(--sh-md)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="brand-mark">N</div>
          <div className="brand-name">
            Nexum <small>POS</small>
          </div>
        </div>
        <div>
          <h1
            className="font-semibold m-0"
            style={{ fontSize: 22, letterSpacing: "-.02em" }}
          >
            {body.title}
          </h1>
          <div className="page-sub mt-1">{body.text}</div>
        </div>
        {result !== "verifying" && (
          <Link href="/login" className="btn btn--accent w-full text-center">
            Ir a iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}
