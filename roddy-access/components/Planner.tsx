"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { site, whatsappLink } from "@/content/site";
import { budgets, groupSizes, needs, needsForType, occasions, planningTypes, areas, type Option } from "@/content/plan";
import { emptyPlan as empty, emailOk, labelOf, phoneOk, summarise, visitorMessage as message, type Plan } from "@/lib/request";

const STORE = "ra-plan";
const STEPS = ["type", "when", "group", "occasion", "needs", "area", "budget", "notes", "contact"] as const;
type Step = (typeof STEPS)[number];

const today = () => new Date().toISOString().slice(0, 10);

export default function Planner() {
  const [plan, setPlan] = useState<Plan>(empty);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const heading = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<number>(0);
  const first = useRef(true);

  // restore a draft, or start from the page the visitor came from
  useEffect(() => {
    let restored = false;
    try {
      const raw = sessionStorage.getItem(STORE);
      if (raw) {
        const saved = JSON.parse(raw);
        setPlan({ ...empty, ...saved.plan });
        setStep(Math.min(saved.step ?? 0, STEPS.length - 1));
        restored = true;
      }
    } catch {}

    const q = new URLSearchParams(window.location.search);
    const type = q.get("type");
    const occasion = q.get("occasion");
    const validType = planningTypes.some((t) => t.value === type) ? type! : "";
    const validOcc = occasions.some((o) => o.value === occasion) ? occasion! : "";
    if (validType || validOcc) {
      setPlan((p) => ({
        ...(restored ? p : empty),
        type: validType || (restored ? p.type : ""),
        occasion: validOcc || (restored ? p.occasion : ""),
        needs: validType ? needsForType[validType] ?? [] : restored ? p.needs : [],
      }));
      // they already chose what they're planning — go straight to "When?"
      if (validType) setStep(1);
      window.history.replaceState(null, "", window.location.pathname);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || status !== "idle") return;
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ plan, step }));
    } catch {}
  }, [plan, step, ready, status]);

  // move focus to the new question for keyboard and screen-reader users
  useEffect(() => {
    if (!ready) return;
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    heading.current?.focus({ preventScroll: true });
  }, [step, status, ready]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const set = <K extends keyof Plan>(key: K, value: Plan[K]) => setPlan((p) => ({ ...p, [key]: value }));

  const current: Step = STEPS[step];

  const valid = useMemo(() => {
    switch (current) {
      case "type":
        return !!plan.type;
      case "when":
        return (!!plan.dateFrom && (!plan.dateTo || plan.dateTo >= plan.dateFrom)) || plan.flexible;
      case "group":
        return !!plan.group;
      case "occasion":
        return !!plan.occasion;
      case "needs":
        return plan.needs.length > 0;
      case "area":
        return !!plan.area;
      case "budget":
        return !!plan.budget;
      case "notes":
        return true;
      case "contact":
        return !!plan.name.trim() && phoneOk(plan.phone) && emailOk(plan.email);
    }
  }, [current, plan]);

  const next = () => {
    if (!valid) {
      setTouched(true);
      return;
    }
    setTouched(false);
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };
  const back = () => {
    setTouched(false);
    setStep((s) => Math.max(0, s - 1));
  };

  // single choices move on by themselves, after a beat so the selection registers
  const choose = (key: "type" | "group" | "occasion" | "area" | "budget", value: string) => {
    setPlan((p) => {
      const nextPlan = { ...p, [key]: value };
      if (key === "type") nextPlan.needs = needsForType[value] ?? [];
      return nextPlan;
    });
    if (key === "occasion" && value === "other") return;
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 380);
  };

  const toggleNeed = (value: string) =>
    setPlan((p) => ({
      ...p,
      needs: p.needs.includes(value) ? p.needs.filter((n) => n !== value) : [...p.needs, value],
    }));

  const honeypot = useRef<HTMLInputElement>(null);

  // the request goes straight to RODDY ACCESS — no WhatsApp step for the visitor
  async function submit() {
    setStatus("sending");
    try {
      const res = await fetch("/api/request/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, website: honeypot.current?.value ?? "" }),
      });
      setStatus(res.ok ? "sent" : "failed");
      if (res.ok) finish();
    } catch {
      setStatus("failed");
    }
  }

  function finish() {
    try {
      sessionStorage.removeItem(STORE);
    } catch {}
  }

  const restart = () => {
    setPlan(empty);
    setStep(0);
    setStatus("idle");
    setTouched(false);
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      next();
    }
  };

  // ------------------------------------------------------------------ done
  if (status === "sent" || status === "failed") {
    const received = status === "sent";
    const wa = whatsappLink(message(plan));
    const mail = `mailto:${site.email}?subject=${encodeURIComponent(
      `Request — ${labelOf(planningTypes, plan.type)}`
    )}&body=${encodeURIComponent(message(plan))}`;

    return (
      <div className="plan">
        <div className="plan__bar">
          <span style={{ width: "100%" }} />
        </div>
        <div className="wrap plan__stage">
          <div className="plan__step" aria-live="polite">
            <p className="label muted">{received ? "Request received" : "Not sent yet"}</p>
            <h1 className="plan__q" ref={heading} tabIndex={-1} style={{ marginTop: "1.5rem" }}>
              {received ? (
                <>
                  We’ll build your options around <em>the details you’ve sent.</em>
                </>
              ) : (
                <>
                  Something went wrong on our side. <em>Send it on WhatsApp</em> and it reaches us directly.
                </>
              )}
            </h1>
            {received && (
              <p className="plan__hint">
                Expect a message on {plan.phone} shortly{plan.name ? `, ${plan.name.split(" ")[0]}` : ""}.
              </p>
            )}

            <dl className="summary">
              {summarise(plan).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>

            {received ? (
              <div style={{ marginTop: "2.5rem", display: "flex", gap: "1.25rem 2rem", flexWrap: "wrap", alignItems: "center" }}>
                <Link href="/" className="btn btn--ink">
                  Back to home
                </Link>
                <button type="button" className="link" onClick={restart}>
                  Plan something else
                </button>
              </div>
            ) : (
              <>
                <div className="done__actions">
                  <a href={wa} className="btn btn--ink" target="_blank" rel="noopener">
                    Continue to WhatsApp
                  </a>
                  <a href={mail} className="link" style={{ justifySelf: "start" }}>
                    Send by email instead
                  </a>
                </div>
                <div style={{ marginTop: "3rem" }}>
                  <button type="button" className="link" onClick={() => setStatus("idle")}>
                    Back to my answers
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ questions
  const progress = ((step + (valid ? 0.6 : 0.25)) / STEPS.length) * 100;
  const error = touched && !valid;

  return (
    <div className="plan">
      <div className="plan__bar" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <form
        className="wrap plan__stage"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
        noValidate
        style={{ visibility: ready ? "visible" : "hidden" }}
      >
        {/* spam trap — hidden from people and screen readers */}
        <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="trap" />
        <p className="label plan__meta">
          <span>Plan your experience</span>
          <span aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </span>
        </p>

        <div className="plan__step" key={current}>
          {current === "type" && (
            <Question title="What are you planning?" heading={heading}>
              <Choices name="type" options={planningTypes} value={plan.type} onChoose={(v) => choose("type", v)} />
            </Question>
          )}

          {current === "when" && (
            <Question title="When?" hint="Arrival and departure. Rough dates are fine." heading={heading}>
              <div className="fields fields--two">
                <div className="field">
                  <label htmlFor="from">From</label>
                  <input
                    id="from"
                    className="input"
                    type="date"
                    min={today()}
                    value={plan.dateFrom}
                    onChange={(e) => set("dateFrom", e.target.value)}
                    onKeyDown={onEnter}
                  />
                </div>
                <div className="field">
                  <label htmlFor="to">To</label>
                  <input
                    id="to"
                    className="input"
                    type="date"
                    min={plan.dateFrom || today()}
                    value={plan.dateTo}
                    onChange={(e) => set("dateTo", e.target.value)}
                    onKeyDown={onEnter}
                  />
                </div>
              </div>
              <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
                <label className="toggle">
                  <input type="checkbox" checked={plan.flexible} onChange={(e) => set("flexible", e.target.checked)} />
                  My dates are flexible
                </label>
                {plan.flexible && !plan.dateFrom && (
                  <div className="field">
                    <label htmlFor="dateNote">Roughly when?</label>
                    <input
                      id="dateNote"
                      className="input"
                      placeholder="A weekend in December"
                      value={plan.dateNote}
                      onChange={(e) => set("dateNote", e.target.value)}
                      onKeyDown={onEnter}
                    />
                  </div>
                )}
              </div>
              {error && <p className="field__error">Add a start date, or tick flexible.</p>}
            </Question>
          )}

          {current === "group" && (
            <Question title="How many people?" heading={heading}>
              <Choices name="group" options={groupSizes} value={plan.group} onChoose={(v) => choose("group", v)} />
            </Question>
          )}

          {current === "occasion" && (
            <Question title="What is the occasion?" heading={heading}>
              <Choices
                name="occasion"
                options={occasions}
                value={plan.occasion}
                onChoose={(v) => choose("occasion", v)}
              />
              {plan.occasion === "other" && (
                <div className="field" style={{ marginTop: "1.75rem" }}>
                  <label htmlFor="occasionOther">Tell us briefly</label>
                  <input
                    id="occasionOther"
                    className="input"
                    autoFocus
                    value={plan.occasionOther}
                    onChange={(e) => set("occasionOther", e.target.value)}
                    onKeyDown={onEnter}
                  />
                </div>
              )}
            </Question>
          )}

          {current === "needs" && (
            <Question title="What do you need?" hint="Choose as many as you like." heading={heading}>
              <div className="choices choices--two" role="group" aria-label="What do you need?">
                {needs.map((o) => {
                  const on = plan.needs.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      className="choice"
                      aria-pressed={on}
                      onClick={() => toggleNeed(o.value)}
                    >
                      {o.label}
                      <span className="choice__state" aria-hidden="true">Added</span>
                    </button>
                  );
                })}
              </div>
              {error && <p className="field__error" style={{ marginTop: "1rem" }}>Choose at least one.</p>}
            </Question>
          )}

          {current === "area" && (
            <Question title="What area works for you?" heading={heading}>
              <Choices name="area" options={areas} value={plan.area} onChoose={(v) => choose("area", v)} />
            </Question>
          )}

          {current === "budget" && (
            <Question
              title="What budget are you working with?"
              hint="A rough number for everything together is fine."
              heading={heading}
            >
              <Choices name="budget" options={budgets} value={plan.budget} onChoose={(v) => choose("budget", v)} />
            </Question>
          )}

          {current === "notes" && (
            <Question title="Anything we should know?" hint="Dietary requirements, timings, the vibe, a surprise…" heading={heading}>
              <div className="field">
                <label htmlFor="notes" className="sr-only">
                  Notes
                </label>
                <textarea
                  id="notes"
                  className="input"
                  rows={5}
                  value={plan.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </Question>
          )}

          {current === "contact" && (
            <Question title="Where do we reach you?" heading={heading}>
              <div className="fields">
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    className="input"
                    autoComplete="name"
                    value={plan.name}
                    onChange={(e) => set("name", e.target.value)}
                    onKeyDown={onEnter}
                    aria-invalid={touched && !plan.name.trim()}
                  />
                  {touched && !plan.name.trim() && <p className="field__error">Your name, please.</p>}
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone / WhatsApp</label>
                  <input
                    id="phone"
                    className="input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+27"
                    value={plan.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    onKeyDown={onEnter}
                    aria-invalid={touched && !phoneOk(plan.phone)}
                  />
                  {touched && !phoneOk(plan.phone) && <p className="field__error">A number we can reach you on.</p>}
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={plan.email}
                    onChange={(e) => set("email", e.target.value)}
                    onKeyDown={onEnter}
                    aria-invalid={touched && !emailOk(plan.email)}
                  />
                  {touched && !emailOk(plan.email) && <p className="field__error">That email doesn’t look right.</p>}
                </div>
              </div>
            </Question>
          )}
        </div>

        <div className="plan__nav">
          <button type="button" className="link plan__back" onClick={back} hidden={step === 0}>
            Back
          </button>
          <button type="submit" className="btn btn--ink" disabled={status === "sending"}>
            {current === "contact"
              ? status === "sending"
                ? "Sending…"
                : "Send request"
              : current === "notes" && !plan.notes.trim()
                ? "Skip"
                : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Question({
  title,
  hint,
  heading,
  children,
}: {
  title: string;
  hint?: string;
  heading: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1 className="plan__q" ref={heading} tabIndex={-1}>
        {title}
      </h1>
      {hint && <p className="plan__hint">{hint}</p>}
      <div className="plan__body">{children}</div>
    </>
  );
}

function Choices({
  name,
  options,
  value,
  onChoose,
}: {
  name: string;
  options: Option[];
  value: string;
  onChoose: (v: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  // arrow keys move between options, as in a native radio group
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    refs.current[(i + d + options.length) % options.length]?.focus();
  };

  return (
    <div className={`choices ${options.length > 6 ? "choices--two" : ""}`} role="radiogroup" aria-label={name}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={i === selected ? 0 : -1}
          className="choice"
          onClick={() => onChoose(o.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {o.label}
          <span className="choice__state" aria-hidden="true">Selected</span>
        </button>
      ))}
    </div>
  );
}
