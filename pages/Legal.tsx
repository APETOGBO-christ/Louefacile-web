import React from 'react';

const Legal: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Conditions generales d'utilisation</h1>
      <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-5 text-gray-600">
        <p>L'acces a la plateforme implique l'acceptation des regles de publication, d'echange et de paiement affichees.</p>
        <p>Les informations annonceur/locataire doivent etre exactes. Toute fraude ou tentative de contournement est suspendue.</p>
        <p>Le pass donne acces a des coordonnees pour une duree limitee et ne garantit pas la conclusion d'un bail.</p>
      </div>
    </section>
  );
};

export default Legal;
