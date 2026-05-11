export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-aria-sand px-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 max-w-sm text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-aria-anthracite mb-2">
          Compte suspendu
        </h1>
        <p className="text-aria-stone text-sm">
          Votre compte a été temporairement suspendu. Contactez l'administrateur
          pour plus d'informations.
        </p>
      </div>
    </div>
  );
}
