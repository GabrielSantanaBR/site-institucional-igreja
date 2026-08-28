"use client";
/* eslint-disable @next/next/no-img-element -- fotos publicadas pelo painel já são otimizadas */

import { useEffect, useMemo, useState } from "react";
import type { ContentItem } from "../../lib/site-content";

export function AgendaExperience({ events, initialNow }: { events: ContentItem[]; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  const [pastLimit, setPastLimit] = useState(6);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const upcoming = useMemo(() => events.filter((event) => event.date && eventEnd(event) >= now).sort(compareEvents), [events, now]);
  const past = useMemo(() => events.filter((event) => event.date && eventEnd(event) < now).sort((left, right) => compareEvents(right, left)), [events, now]);
  const calendarEvents = useMemo(() => events.filter((event) => event.date).sort(compareEvents), [events]);
  const today = useMemo(() => saoPauloDate(now), [now]);
  const firstDate = upcoming[0]?.date || today;
  const [month, setMonth] = useState(() => monthStart(firstDate));
  const [selectedDate, setSelectedDate] = useState(firstDate);
  const cells = useMemo(() => calendarCells(month), [month]);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ContentItem[]>();
    for (const event of calendarEvents) {
      const day = grouped.get(event.date) ?? [];
      day.push(event); grouped.set(event.date, day);
    }
    return grouped;
  }, [calendarEvents]);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const nextFive = upcoming.slice(0, 5);

  function changeMonth(amount: number) {
    const next = moveMonth(month, amount);
    setMonth(next);
    setSelectedDate(`${next.slice(0, 7)}-01`);
  }

  function openDate(date: string) {
    setMonth(monthStart(date));
    setSelectedDate(date);
    window.requestAnimationFrame(() => document.getElementById("agenda-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return <>
    <section className="section agenda-main-section"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">Programação atual</p><h2>Os 5 próximos eventos</h2></div><p>A lista anda automaticamente conforme as programações terminam. Fotos são opcionais.</p></div>
      {nextFive.length ? <div className="upcoming-event-cards">{nextFive.map((event, index) => <article key={event.id} className={index === 0 ? "featured" : ""}>{event.imageUrl ? <img src={event.imageUrl} alt={`Imagem do evento ${event.title}`} style={{ objectPosition: event.imagePosition }} loading={index < 2 ? "eager" : "lazy"} /> : <div className="event-card-art" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span></div>}<div className="event-card-body"><span className="event-card-category">{event.subtitle || "Programação PIBRG"}</span><time dateTime={`${event.date}${event.time ? `T${event.time}` : ""}`}>{formatEventDate(event.date)}</time><h3>{event.title}</h3><div className="event-card-meta"><span>{event.time ? `${event.time}h` : "Horário a confirmar"}</span>{event.location && <span>{event.location}</span>}</div>{event.body && <p>{event.body}</p>}<button type="button" className="event-card-link" onClick={() => openDate(event.date)}>Ver no calendário <span aria-hidden="true">→</span></button></div></article>)}</div> : <p className="public-empty">Novas programações serão publicadas em breve.</p>}
    </div></section>

    <section className="section agenda-calendar-section" id="agenda-calendar"><div className="container"><div className="agenda-public-layout"><div className="public-calendar"><header><div><p className="eyebrow eyebrow-light">Calendário completo</p><h2>{monthTitle(month)}</h2><span>Programações futuras e eventos já realizados permanecem disponíveis.</span></div><div><button type="button" aria-label="Ver mês anterior" onClick={() => changeMonth(-1)}>←</button><button type="button" onClick={() => { setMonth(monthStart(today)); setSelectedDate(today); }}>Hoje</button><button type="button" aria-label="Ver próximo mês" onClick={() => changeMonth(1)}>→</button></div></header><div className="public-calendar-labels">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div><div className="public-calendar-days">{cells.map((cell) => { const count = eventsByDate.get(cell.key)?.length ?? 0; const isPastDay = cell.key < today; return <button type="button" key={cell.key} className={`${cell.current ? "" : "outside"} ${count ? "has-event" : ""} ${isPastDay ? "past-day" : ""} ${cell.key === selectedDate ? "selected" : ""} ${cell.key === today ? "today" : ""}`} aria-label={`${formatAccessibleDate(cell.key)}${count ? `, ${count} ${count === 1 ? "evento" : "eventos"}` : ", sem eventos"}`} onClick={() => setSelectedDate(cell.key)}><span>{Number(cell.key.slice(8, 10))}</span>{count > 0 && <i aria-hidden="true">{count}</i>}</button>; })}</div></div>
        <aside className="public-day-agenda" aria-live="polite"><p className="eyebrow">Eventos do dia</p><h2>{formatSelectedDate(selectedDate)}</h2>{selectedEvents.length ? <div>{selectedEvents.map((event) => { const realized = eventEnd(event) < now; return <article key={event.id} className={realized ? "past-event" : ""}>{event.imageUrl && <img src={event.imageUrl} alt={`Imagem do evento ${event.title}`} style={{ objectPosition: event.imagePosition }} loading="lazy" />}<div><b>{realized ? "Evento realizado" : "Próxima programação"}</b><span>{event.time ? `${event.time}h` : "Horário a confirmar"}{event.location ? ` • ${event.location}` : ""}</span><h3>{event.title}</h3>{event.body && <p>{event.body}</p>}</div></article>; })}</div> : <div className="public-day-empty"><span aria-hidden="true">○</span><strong>Nenhum evento nesta data</strong><p>Escolha um dos dias marcados no calendário para ver a programação.</p></div>}</aside>
      </div>{past.length > 0 && <section className="past-event-archive" aria-labelledby="past-events-title"><header><div><p className="eyebrow eyebrow-light">Histórico</p><h2 id="past-events-title">Eventos já realizados</h2></div><span>{past.length} {past.length === 1 ? "registro preservado" : "registros preservados"}</span></header><div>{past.slice(0, pastLimit).map((event) => <article key={event.id}>{event.imageUrl ? <img src={event.imageUrl} alt={`Imagem do evento ${event.title}`} style={{ objectPosition: event.imagePosition }} loading="lazy" /> : <div className="past-event-placeholder" aria-hidden="true">PIBRG</div>}<div><time dateTime={`${event.date}${event.time ? `T${event.time}` : ""}`}>{formatEventDate(event.date)}</time><h3>{event.title}</h3><p>{event.body || event.location || "Evento realizado pela PIBRG."}</p></div><button type="button" onClick={() => openDate(event.date)}>Ver no calendário</button></article>)}</div>{pastLimit < past.length && <button type="button" className="past-events-more" onClick={() => setPastLimit((value) => value + 6)}>Mostrar mais eventos anteriores</button>}</section>}</div></section>
  </>;
}

function eventEnd(event: ContentItem) {
  const time = event.time || "23:59";
  const value = Date.parse(`${event.date}T${time}:59-03:00`);
  return Number.isFinite(value) ? value : 0;
}
function compareEvents(left: ContentItem, right: ContentItem) { return `${left.date}T${left.time || "23:59"}`.localeCompare(`${right.date}T${right.time || "23:59"}`) || left.sortOrder - right.sortOrder; }
function saoPauloDate(timestamp: number) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(timestamp)); }
function monthStart(dateKey: string) { return `${dateKey.slice(0, 7)}-01`; }
function moveMonth(monthKey: string, amount: number) { const date = new Date(`${monthKey}T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount); return date.toISOString().slice(0, 7) + "-01"; }
function monthTitle(monthKey: string) { return capitalize(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthKey}T12:00:00Z`))); }
function calendarCells(monthKey: string) { const first = new Date(`${monthKey}T12:00:00Z`); const start = new Date(first); start.setUTCDate(1 - first.getUTCDay()); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); const key = date.toISOString().slice(0, 10); return { key, current: key.slice(0, 7) === monthKey.slice(0, 7) }; }); }
function formatEventDate(value: string) { return capitalize(new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`))); }
function formatSelectedDate(value: string) { return capitalize(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`))); }
function formatAccessibleDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)); }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
