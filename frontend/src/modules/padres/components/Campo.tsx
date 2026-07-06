function Campo({ label, value, onChange, placeholder, inputMode, disabled = false }) {
  return (
    <label className="padres-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
      />
    </label>
  );
}

export default Campo;
