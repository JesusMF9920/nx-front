export function ClientNewForm() {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      <div className="field col-span-full">
        <span className="label">Tipo</span>
        <div className="flex gap-1.5">
          <button type="button" className="btn btn--primary btn--sm">Negocio</button>
          <button type="button" className="btn btn--sm">Persona física</button>
        </div>
      </div>
      <div className="field">
        <span className="label">Razón social / Nombre</span>
        <input className="input" placeholder="Ej. Imprenta Río" />
      </div>
      <div className="field">
        <span className="label">RFC</span>
        <input className="input" placeholder="XXX0000000XX0" />
      </div>
      <div className="field">
        <span className="label">Persona de contacto</span>
        <input className="input" />
      </div>
      <div className="field">
        <span className="label">Teléfono</span>
        <input className="input" placeholder="55 0000 0000" />
      </div>
      <div className="field">
        <span className="label">Correo</span>
        <input className="input" placeholder="contacto@cliente.mx" />
      </div>
      <div className="field">
        <span className="label">Régimen fiscal</span>
        <select className="select">
          <option>601 — Régimen general</option>
          <option>612 — Persona física</option>
        </select>
      </div>
      <div className="field col-span-full">
        <span className="label">Notas internas</span>
        <textarea className="textarea" rows={3} placeholder="Preferencias, restricciones, contactos secundarios…" />
      </div>
      <div className="field col-span-full">
        <span className="label">Etiquetas</span>
        <div className="flex gap-1.5 flex-wrap">
          {["Frecuente", "Mayoreo", "Crédito 15", "Crédito 30", "VIP", "Sin facturación"].map((t) => (
            <button type="button" key={t} className="btn btn--sm">{t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
