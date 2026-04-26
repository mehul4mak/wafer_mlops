import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-900 flex flex-col">
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white">💰 SplitMate</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="text-white/80 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-white text-brand-700 px-4 py-2 rounded-lg font-semibold hover:bg-brand-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
          Stop Chasing<br />
          <span className="text-brand-100">People for Money</span>
        </h1>
        <p className="text-xl text-white/80 max-w-2xl mb-10">
          SplitMate is the Splitwise alternative built for teams, flatmates, trips, and families.
          Track expenses, assign responsibility, upload payment proof, and settle up — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/register"
            className="bg-white text-brand-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-brand-50 transition-colors"
          >
            Start for Free
          </Link>
          <Link
            href="/login"
            className="border-2 border-white/50 text-white px-8 py-4 rounded-xl font-bold text-lg hover:border-white transition-colors"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: "💳", title: "Expense Tracking", desc: "Add expenses, split equally, by amount or percentage. Attach receipts instantly." },
            { icon: "✅", title: "Task Ownership", desc: "Assign responsibilities to group members with due dates. The Splitwise killer feature." },
            { icon: "🔒", title: "Payment Proof", desc: "Upload bank transfer screenshots and receipts. Zero disputes, maximum trust." },
          ].map((f) => (
            <div key={f.title} className="text-center p-6">
              <div className="text-5xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-gray-900 text-white/60 py-8 text-center text-sm">
        © 2026 SplitMate · Built for the modern team
      </footer>
    </main>
  );
}
