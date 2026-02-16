import React from 'react';

const Privacy: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Politique de confidentialite</h1>
      <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-5 text-gray-600">
        <p>Nous collectons uniquement les donnees necessaires a l'authentification, la recherche et la mise en relation.</p>
        <p>Les donnees sont conservees pour fournir le service, securiser les transactions et prevenir les abus.</p>
        <p>Vous pouvez demander la rectification ou la suppression de vos donnees via le support officiel.</p>
      </div>
    </section>
  );
};

export default Privacy;
