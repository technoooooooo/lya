import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="flex min-h-svh">
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <SignUpForm />
        </div>
      </div>
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden">
        {/* Mathieu est à ~28 % de la largeur de la photo : on l'aligne sur le
            centre du panneau quelle que soit la largeur (translateX est en %
            de l'image elle-même), au lieu d'un object-position fixe. */}
        <img
          src="/images/golf-hero.jpg"
          alt=""
          className="absolute top-0 left-1/2 h-full w-auto max-w-none -translate-x-[28%]"
        />
      </div>
    </div>
  );
}
