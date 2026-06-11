export default function StudentHeader({ estudiante, nombreCorto, bannerEstudiante }) {
  return (
    <section className="padres-flow-student-card">
      <div className="padres-flow-student-copy">
        <div>
          <span>Bienvenido familia de</span>
          <h1>{estudiante?.nombres || nombreCorto}</h1>
          <p>{estudiante?.grado || "Grado por registrar"}</p>
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
