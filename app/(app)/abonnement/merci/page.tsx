import { PaymentConfirmation } from "@/components/billing/PaymentConfirmation";

export const dynamic = "force-dynamic";

export default function MerciPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <PaymentConfirmation />
    </div>
  );
}
