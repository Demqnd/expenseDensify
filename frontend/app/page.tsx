type HealthResponse = {
  status?: string;
};

async function getBackendStatus() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_HEALTH_URL;
  const healthUrls = configuredUrl
    ? [configuredUrl]
    : [
        "http://localhost:5000/api/health",
        "http://localhost:5178/api/health",
      ];

  for (const url of healthUrls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as HealthResponse;
      return {
        status: data.status ?? "unknown",
        sourceUrl: url,
      };
    } catch {
      // Try the next candidate URL.
    }
  }

  return {
    status: "unreachable",
    sourceUrl: healthUrls[0],
  };
}

export default async function Home() {
  const backend = await getBackendStatus();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">ExpenseDensify</h1>
        <p className="text-xl text-gray-600">Expense tracking application</p>
        <section className="rounded-lg border border-gray-300 px-6 py-4 text-left shadow-sm">
          <h2 className="text-lg font-semibold">Backend Health</h2>
          <p className="mt-2 text-base">
            Backend Status: <strong>{backend.status}</strong>
          </p>
          <p className="mt-1 text-sm text-gray-500">Source: {backend.sourceUrl}</p>
        </section>
      </div>
    </main>
  );
}
