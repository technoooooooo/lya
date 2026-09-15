import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="flex min-h-svh">
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <SignUpForm />
        </div>
      </div>
      <div className="hidden lg:block lg:flex-1 relative">
        <img
          src="/images/golf-hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[40%_center]"
        />
      </div>
    </div>
  );
}
