export default function StudentHeader({ estudiante, nombreCorto, bannerEstudiante }) {
  const formatearGrado = () => {
    let labelGrado = estudiante?.grado || "";
    if (!labelGrado) return "Grado por registrar";
    
    const nivel = estudiante?.nivel || estudiante?.nivelEducativo || "";
    const gTrim = String(labelGrado).trim();
    
    if (/^\d+$/.test(gTrim) && nivel) {
      const gradoNum = parseInt(gTrim, 10);
      const nivelLower = nivel.toLowerCase();
      
      if (nivelLower.includes("inicial")) {
        return `${gradoNum} años Inicial`;
      } else {
        const sufijos = { 1: "1er", 2: "2do", 3: "3er", 4: "4to", 5: "5to", 6: "6to" };
        const sufijo = sufijos[gradoNum] || `${gradoNum}°`;
        return `${sufijo} de ${nivel}`;
      }
    }
    
    if (/^\d+$/.test(gTrim)) {
      return `Grado: ${gTrim}`;
    }
    
    if (nivel && !gTrim.toLowerCase().includes(nivel.toLowerCase())) {
      return `${gTrim} de ${nivel}`;
    }
    
    return gTrim;
  };

  return (
    <section className="padres-flow-student-card">
      <div className="padres-flow-student-copy">
        <div>
          <span>Bienvenido familia de</span>
          <h1>{estudiante?.nombres || nombreCorto}</h1>
          <p>{formatearGrado()}</p>
        </div>
      </div>

      {bannerEstudiante ? (
        <div className="padres-flow-student-art-wrap">
          <img className="padres-flow-student-art" src={bannerEstudiante} alt="" aria-hidden="true" />
        </div>
      ) : null}
    </section>
  );
}
