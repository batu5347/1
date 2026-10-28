import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { gradeAt } from "../grade";
import { clamp, easeOut, sstep } from "../lib/math";
import { clockMinutes, CUES, EVENTS, fmtClock, FPS, wordAt, WORDS } from "../timeline";

// TikTok-Oberfläche: oben ~250 px, unten ~430 px (Beschreibung), rechts ~160 px (Buttons)
export const SAFE = { top: 250, bottom: 430, left: 64, right: 160 };
const CONTENT_W = 1080 - SAFE.left - SAFE.right;

const FONT = {
  head: "Oswald, Inter, sans-serif",
  body: "Inter, sans-serif",
  mono: "'JetBrains Mono', monospace",
};
const ACCENT = "#ffcf5a";
const ALERT = "#ff6a3d";
const OUTLINE = "0 0 2px rgba(0,0,0,0.95), 0 3px 10px rgba(0,0,0,0.75), 0 0 28px rgba(0,0,0,0.45)";

const useT = () => useCurrentFrame() / FPS;

/** Farbkorrektur-Überlagerung, Vignette, Filmkorn und Licht-Blitze bei den Einschlägen */
export const Grade: React.FC = () => {
  const t = useT();
  const g = gradeAt(t);
  const flash = (t0: number) => (t >= t0 && t < t0 + 0.9 ? Math.exp(-(t - t0) * 6) : 0);
  const f = Math.max(flash(EVENTS.impact1.t + 0.03), flash(EVENTS.impact2.t + 0.02) * 1.2);
  const frame = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{ background: "#ff9a3c", opacity: g.warm, mixBlendMode: "soft-light" }} />
      <AbsoluteFill style={{ background: "#3d5a80", opacity: g.cool, mixBlendMode: "soft-light" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.55) 100%)" }} />
      <AbsoluteFill style={{ background: "#fff1d6", opacity: f * 0.28, mixBlendMode: "screen" }} />
      <AbsoluteFill
        style={{
          opacity: 0.07,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${frame % 12}'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>")`,
        }}
      />
      {/* Lesbarkeit: dezenter Verlauf hinter dem Untertitelbereich */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 80%, rgba(0,0,0,0.3) 100%)" }} />
    </>
  );
};

/** Hinweis: fiktionalisierte Rekonstruktion */
export const Disclaimer: React.FC = () => {
  const t = useT();
  const o = sstep(0.25, 0.7, t) * (1 - sstep(5.2, 5.8, t));
  const small = sstep(5.6, 6.2, t);
  return (
    <>
      {o > 0 && (
        <div style={{ position: "absolute", top: SAFE.top + 4, left: SAFE.left, width: CONTENT_W, display: "flex", justifyContent: "center", opacity: o }}>
          <div
            style={{
              fontFamily: FONT.body,
              fontWeight: 700,
              fontSize: 25,
              letterSpacing: 1.2,
              color: "rgba(255,255,255,0.92)",
              background: "rgba(10,12,16,0.55)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 999,
              padding: "10px 22px",
              textAlign: "center",
            }}
          >
            FIKTIONALISIERTE POV-REKONSTRUKTION · STILISIERTE DARSTELLUNG REALER EREIGNISSE
          </div>
        </div>
      )}
      {/* dauerhafte, kleine Kennzeichnung */}
      <div style={{ position: "absolute", top: SAFE.top + 150, left: SAFE.left, opacity: small * 0.7, fontFamily: FONT.body, fontWeight: 700, fontSize: 19, letterSpacing: 2.5, color: "rgba(255,255,255,0.8)", textShadow: OUTLINE }}>
        REKONSTRUKTION · STILISIERT
      </div>
    </>
  );
};

/** Hook: „NEW YORK, 11. SEPTEMBER 2001“ und „In wenigen Minuten wird sich alles verändern.“ */
export const HookTitle: React.FC = () => {
  const t = useT();
  if (t > 5.6) return null;
  const tIn = wordAt("In", "s1");
  const a = easeOut(clamp((t - 0.12) / 0.45));
  const out1 = sstep(tIn - 0.35, tIn - 0.05, t);
  const words2 = WORDS.filter((w) => w.scene === "s1" && w.start >= tIn - 0.01);
  const fade2 = 1 - sstep(5.1, 5.5, t);
  return (
    <div style={{ position: "absolute", left: SAFE.left, width: CONTENT_W, top: 1010, height: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      {out1 < 1 && (
        <div style={{ opacity: a * (1 - out1), transform: `translateY(${(1 - a) * 40 - out1 * 20}px) scale(${1.12 - 0.12 * a})`, filter: `blur(${(1 - a) * 8}px)` }}>
          <div style={{ fontFamily: FONT.body, fontWeight: 800, fontSize: 34, letterSpacing: 8, color: "rgba(255,255,255,0.9)", textShadow: OUTLINE, marginBottom: 6 }}>POV</div>
          <div style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: 150, lineHeight: 0.95, color: "#fff", letterSpacing: 2, textShadow: OUTLINE }}>NEW YORK,</div>
          <div
            style={{
              fontFamily: FONT.head,
              fontWeight: 600,
              fontSize: 78,
              lineHeight: 1.05,
              color: ACCENT,
              letterSpacing: interpolate(t, [0.2, 3.2], [3, 7], { extrapolateRight: "clamp" }),
              textShadow: OUTLINE,
              opacity: sstep(0.45, 0.9, t),
            }}
          >
            11. SEPTEMBER 2001
          </div>
        </div>
      )}
      {t >= tIn - 0.1 && (
        <div style={{ position: "absolute", fontFamily: FONT.body, fontWeight: 800, fontSize: 70, lineHeight: 1.12, color: "#fff", textShadow: OUTLINE, opacity: fade2, maxWidth: CONTENT_W }}>
          {words2.map((w, i) => {
            const k = sstep(w.start - 0.08, w.start + 0.12, t);
            return (
              <span key={i} style={{ opacity: 0.12 + 0.88 * k, display: "inline-block", marginRight: 18, transform: `translateY(${(1 - k) * 10}px)`, color: w.text.startsWith("verändern") ? ACCENT : "#fff" }}>
                {w.text}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Uhrzeit-Einblendung (läuft mit der historischen Zeit) */
export const ClockHUD: React.FC = () => {
  const t = useT();
  const o = sstep(5.0, 5.6, t) * (1 - sstep(54.4, 55.0, t));
  if (o <= 0) return null;
  const mins = clockMinutes(t);
  const near = [EVENTS.impact1, EVENTS.impact2, EVENTS.collapseS, EVENTS.collapseN].some((e) => t >= e.t && t < e.t + 3.5);
  const pulse = near ? 0.5 + 0.5 * Math.cos((t * Math.PI * 2) / 0.9) : 0;
  return (
    <div style={{ position: "absolute", top: SAFE.top + 4, left: SAFE.left, opacity: o, textShadow: OUTLINE }}>
      <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: "rgba(255,255,255,0.85)" }}>DI · 11.09.2001 · NEW YORK</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 84, color: near ? ALERT : "#fff", lineHeight: 1.0, transform: `scale(${1 + pulse * 0.04})`, transformOrigin: "left center" }}>{fmtClock(mins)}</div>
        <div style={{ fontFamily: FONT.body, fontWeight: 800, fontSize: 28, color: "rgba(255,255,255,0.85)" }}>UHR</div>
      </div>
    </div>
  );
};

/** Große Ereignis-Einblendungen mit Uhrzeit */
const EVENT_LABELS = [
  { t: EVENTS.impact1.t + 0.45, time: "08:46 UHR", text: "DER ERSTE EINSCHLAG", dur: 3.9 },
  { t: EVENTS.impact2.t + 0.45, time: "09:03 UHR", text: "EIN ZWEITER EINSCHLAG", dur: 3.9 },
  { t: EVENTS.collapseS.t + 0.2, time: "09:59 UHR", text: "DER SÜDTURM STÜRZT EIN", dur: 3.4 },
  { t: EVENTS.collapseN.t + 0.2, time: "10:28 UHR", text: "AUCH DER NORDTURM STÜRZT EIN", dur: 2.9 },
];
export const EventLabels: React.FC = () => {
  const t = useT();
  return (
    <>
      {EVENT_LABELS.map((e) => {
        const lt = t - e.t;
        if (lt < 0 || lt > e.dur) return null;
        const a = easeOut(clamp(lt / 0.35));
        const o = a * (1 - sstep(e.dur - 0.45, e.dur, lt));
        const barW = easeOut(clamp(lt / 0.6));
        return (
          <div key={e.time} style={{ position: "absolute", left: SAFE.left, width: CONTENT_W, top: 1090, display: "flex", flexDirection: "column", alignItems: "center", opacity: o, transform: `translateY(${(1 - a) * 24}px)` }}>
            <div style={{ height: 6, width: 380 * barW, background: ALERT, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.5)" }} />
            <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 96, lineHeight: 1, color: ALERT, textShadow: OUTLINE, letterSpacing: 2 }}>{e.time}</div>
            <div style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: 64, lineHeight: 1.1, color: "#fff", textShadow: OUTLINE, textAlign: "center", letterSpacing: 1.5, marginTop: 6 }}>{e.text}</div>
          </div>
        );
      })}
    </>
  );
};

/** Untertitel: max. zwei Zeilen, wortgenau zur Stimme, Uhrzeiten hervorgehoben */
const FINAL_FROM = wordAt("Ein", "s8");
export const Subtitles: React.FC = () => {
  const t = useT();
  const cue = CUES.find((c) => t >= c.start && t < c.end && c.scene !== "s1" && WORDS[c.words[0]].start < FINAL_FROM - 0.01);
  if (!cue) return null;
  const words = cue.words.map((i) => WORDS[i]);
  const k = sstep(cue.start, cue.start + 0.12, t) * (1 - sstep(cue.end - 0.1, cue.end, t));
  // Event-Label sichtbar? Dann Untertitel etwas tiefer
  return (
    <div style={{ position: "absolute", left: SAFE.left, width: CONTENT_W, bottom: SAFE.bottom + 50, display: "flex", justifyContent: "center", opacity: k }}>
      <div style={{ fontFamily: FONT.body, fontWeight: 800, fontSize: 58, lineHeight: 1.18, textAlign: "center", color: "#fff", textShadow: OUTLINE, maxWidth: CONTENT_W - 20, transform: `translateY(${(1 - k) * 8}px)` }}>
        {words.map((w, i) => {
          const spoken = t >= w.start - 0.04;
          const isTime = /\d:\d\d/.test(w.text);
          const color = isTime ? ALERT : w.key ? ACCENT : "#fff";
          return (
            <span key={i} style={{ color, opacity: spoken ? 1 : 0.55, marginRight: i < words.length - 1 ? 14 : 0, display: "inline-block", whiteSpace: "nowrap" }}>
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Finale: „Ein Tag, der die Welt veränderte.“ + Gedenkzeile */
export const FinaleText: React.FC = () => {
  const t = useT();
  const t0 = FINAL_FROM - 0.15;
  if (t < t0) return null;
  const a = easeOut(clamp((t - t0) / 1.1));
  const b = sstep(t0 + 1.0, t0 + 1.9, t);
  return (
    <div style={{ position: "absolute", left: SAFE.left, width: CONTENT_W, top: 640, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ fontFamily: FONT.head, fontWeight: 600, fontSize: 92, lineHeight: 1.08, color: "#fff", textShadow: OUTLINE, opacity: a, transform: `translateY(${(1 - a) * 18}px)`, letterSpacing: 1 }}>
        Ein Tag, der die
        <br />
        Welt veränderte.
      </div>
      <div style={{ width: 120 * b, height: 3, background: "rgba(255,255,255,0.7)", margin: "30px 0 22px" }} />
      <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 34, color: "rgba(255,255,255,0.92)", textShadow: OUTLINE, opacity: b, letterSpacing: 0.5 }}>
        11. September 2001 – Zum Gedenken an die Opfer.
      </div>
    </div>
  );
};
