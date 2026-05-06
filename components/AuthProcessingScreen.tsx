import LogoLoadingScreen from "@/components/LogoLoadingScreen";

type AuthProcessingScreenProps = {
  title: string;
  subtitle: string;
};

export default function AuthProcessingScreen({ title, subtitle }: AuthProcessingScreenProps) {
  return <LogoLoadingScreen title={title} subtitle={subtitle} overlay />;
}
