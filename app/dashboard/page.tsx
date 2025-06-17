import Image from "next/image";

export default function Dashboard() {
  const stats = [
    { label: "Total Sales", value: "$12,340" },
    { label: "Orders", value: "54" },
    { label: "Customers", value: "31" },
  ];

  return (
    <div className="min-h-screen bg-[#111111] text-white font-sans grid grid-cols-[200px_1fr]">
      <aside className="bg-[#1a1a1a] p-6 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Seller</h1>
        <nav className="flex flex-col gap-2">
          <a href="#" className="hover:text-[#FA4616]">Dashboard</a>
          <a href="#" className="hover:text-[#FA4616]">Products</a>
          <a href="#" className="hover:text-[#FA4616]">Payouts</a>
          <a href="#" className="hover:text-[#FA4616]">Settings</a>
        </nav>
      </aside>
      <main className="p-10 flex flex-col gap-8">
        <div className="flex items-center gap-2">
          <Image src="/next.svg" alt="logo" width={100} height={22} className="dark:invert" />
          <h2 className="text-2xl font-semibold">Dashboard</h2>
        </div>
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-[#1a1a1a] rounded-lg p-6 flex flex-col gap-2">
              <span className="text-sm text-gray-400">{label}</span>
              <span className="text-2xl font-bold">{value}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
