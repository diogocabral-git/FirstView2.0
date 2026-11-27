import { SharedProfitSheet } from "./shared";

export const metadata = { title: "Profit Sheet partilhada · FirstView" };

export default function SharedProfitSheetPage() {
  return (
    <main className="mx-auto max-w-[1600px] p-6">
      <SharedProfitSheet />
    </main>
  );
}
