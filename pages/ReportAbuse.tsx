import React from 'react';

const ReportAbuse: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Signaler un abus</h1>
      <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-5 text-gray-600">
        <p>Pour signaler une annonce suspecte, envoyez l'identifiant de l'annonce, les captures utiles et le contexte.</p>
        <p>Email support: <a href="mailto:support@louefacile.ci" className="text-primary-600 font-semibold">support@louefacile.ci</a></p>
        <p>Chaque signalement est examine prioritairement pour proteger les locataires et les proprietaires.</p>
      </div>
    </section>
  );
};

export default ReportAbuse;
