import { AuthForm } from "../../components/organisms/AuthForm";
import { demoAktif } from "../../lib/auth/session";

export default function LoginPage() {
  // Dibaca di server per request: akun demo hanya tampil bila DEMO_MODE=true.
  return <AuthForm mode="masuk" demo={demoAktif()} />;
}
