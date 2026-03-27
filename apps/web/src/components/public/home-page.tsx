import { APP_NAME } from "@eco-globe/shared";

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">{APP_NAME}</h1>
      <p className="mt-4 text-lg text-gray-600">
        Feedstock Marketplace
      </p>
    </main>
  );
}
