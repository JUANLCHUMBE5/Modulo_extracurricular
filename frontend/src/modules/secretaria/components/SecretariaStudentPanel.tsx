import SecretariaRegistroStudentPanel from "./SecretariaRegistroStudentPanel";
import SecretariaDefaultStudentPanel from "./SecretariaDefaultStudentPanel";

export default function SecretariaStudentPanel(props: any) {
  if (!props.estudiante) return null;

  if (props.modoRegistro || props.modoBusquedaAsistencia === false) {
    return <SecretariaRegistroStudentPanel {...props} />;
  }

  return <SecretariaDefaultStudentPanel {...props} />;
}
