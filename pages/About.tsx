import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Filter,
  HandCoins,
  History,
  HousePlus,
  Lock,
  MapPinned,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  return (
    <div className="bg-stone-50 text-slate-900">
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-br from-stone-100 via-white to-blue-50 pt-28 pb-20 lg:pt-36 lg:pb-24">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-200/60 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-stone-200/70 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm mb-6">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Mission LoueFacile
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] text-slate-950 mb-6">
              Trouver la bonne chambre,
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700">
                vite, sans surprises.
              </span>
            </h1>

            <p className="max-w-3xl text-lg md:text-2xl text-slate-600 leading-relaxed mb-8">
              LoueFacile a ete concu pour supprimer les visites inutiles, les conditions qui changent au dernier moment et le manque de transparence.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Pillar
                icon={<HandCoins size={20} />}
                title="Moins d'argent perdu"
                text="Reduire les visites payantes inutiles et les deplacements sans valeur."
              />
              <Pillar
                icon={<ShieldCheck size={20} />}
                title="Moins de mauvaises surprises"
                text="Afficher les conditions critiques avant la visite et les garder visibles."
              />
              <Pillar
                icon={<Clock3 size={20} />}
                title="Moins de temps gaspille"
                text="Filtrer finement pour prendre une decision plus rapidement."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-700 mb-2">Les 3 douleurs majeures</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">Ce que nous eliminons</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <PainCard
              icon={<XCircle size={20} />}
              title="Visites inutiles et couteuses"
              text="Le locataire paie parfois 4 000 FCFA par visite alors que le logement ne correspond pas."
            />
            <PainCard
              icon={<XCircle size={20} />}
              title="Conditions qui changent sur place"
              text="Avance, caution, wifi, compteur ou charges peuvent changer au dernier moment."
            />
            <PainCard
              icon={<XCircle size={20} />}
              title="Retards et opacite"
              text="Rendez-vous incertains, informations floues, dependance au demarcheur."
            />
          </div>
        </div>
      </section>

      <section className="py-16 border-b border-stone-200 bg-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500 mb-2">Promesse produit (web + mobile)</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">Ce que vous obtenez concretement</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PromiseCard
              icon={<CheckCircle2 size={20} />}
              title="Conditions claires et figees avant visite"
              text="Les details critiques du logement sont visibles et comparables avant de vous deplacer."
            />
            <PromiseCard
              icon={<Filter size={20} />}
              title="Filtrage precis selon vos attentes"
              text="Prix, avance, charges, regles, quartier et type de logement."
            />
            <PromiseCard
              icon={<Lock size={20} />}
              title="Modele pass transparent"
              text="Deblocage du contact et de la localisation exacte via un pass limite dans le temps."
            />
            <PromiseCard
              icon={<History size={20} />}
              title="Verification + historique de changements"
              text="Annonce verifiee ou notee, avec trace des modifications importantes."
            />
          </div>
        </div>
      </section>
      <section className="py-16 border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-700 mb-2">Comment ca marche</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">Un parcours simple en 4 etapes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StepCard
              index="01"
              icon={<Search size={18} />}
              title="Rechercher"
              text="Vous lancez une recherche dans votre zone cible."
            />
            <StepCard
              index="02"
              icon={<Filter size={18} />}
              title="Filtrer"
              text="Vous affinez selon vos contraintes reelles."
            />
            <StepCard
              index="03"
              icon={<Lock size={18} />}
              title="Debloquer"
              text="Vous activez le pass pour obtenir le contact et la position exacte."
            />
            <StepCard
              index="04"
              icon={<HousePlus size={18} />}
              title="Decider"
              text="Vous visitez uniquement les options qui correspondent."
            />
          </div>
        </div>
      </section>

      <section className="py-16 border-b border-stone-200 bg-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
            <div className="rounded-3xl border border-stone-300 bg-white p-7">
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500 mb-3">Ce qui doit etre visible avant visite</p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">Conditions non negociables</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ConditionChip text="Loyer mensuel" />
                <ConditionChip text="Mois d'avance" />
                <ConditionChip text="Mois de caution" />
                <ConditionChip text="Charges incluses ou non" />
                <ConditionChip text="Compteur / wifi" />
                <ConditionChip text="Regles de logement" />
              </div>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-7">
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-700 mb-3">Traque des changements</p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">Historique consultable</h3>
              <div className="space-y-3">
                <HistoryRow version="Version 3" text="Loyer et charges confirms" />
                <HistoryRow version="Version 2" text="Mise a jour des regles et equipements" />
                <HistoryRow version="Version 1" text="Annonce publiee et verifiee initialement" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500 mb-2">FAQ Mission</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">Questions frequentes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FaqCard
              q="Pourquoi un pass pour voir les coordonnees ?"
              a="Le pass limite les demandes non serieuses, protege les annonces et structure l'acces aux contacts."
            />
            <FaqCard
              q="Les annonces sont-elles toutes verifiees ?"
              a="Elles sont verifiees ou notees avec un niveau de confiance visible. L'objectif est la transparence, pas la promesse floue."
            />
            <FaqCard
              q="Que se passe-t-il si une condition change ?"
              a="Le changement doit etre trace dans l'annonce. Vous pouvez signaler un abus si la realite ne correspond pas aux informations affichees."
            />
            <FaqCard
              q="Puis-je filtrer selon mes contraintes reelles ?"
              a="Oui. Le produit est construit pour filtrer avant de se deplacer et accelerer une decision pertinente."
            />
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-stone-100 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 mb-5">
            <MapPinned size={16} className="text-blue-700" />
            Mission: rapidite + clarte + confiance
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-5">
            Trouvez vite une chambre adaptee a vos attentes.
          </h2>
          <p className="text-lg md:text-xl text-slate-600 mb-8">
            LoueFacile structure l'information avant la visite pour reduire les pertes d'argent, de temps et d'energie.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/search" className="bg-blue-700 text-white px-8 py-4 rounded-2xl font-extrabold hover:bg-blue-800 transition-colors">
              Lancer ma recherche
            </Link>
            <Link
              to="/report-abuse"
              className="bg-white border border-stone-300 text-slate-800 px-8 py-4 rounded-2xl font-bold hover:border-stone-400 transition-colors"
            >
              Signaler un abus
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
const Pillar = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="rounded-3xl border border-stone-300 bg-white p-5 shadow-sm">
    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">{icon}</div>
    <h3 className="text-lg font-black text-slate-900 mb-1">{title}</h3>
    <p className="text-slate-600 text-sm leading-relaxed">{text}</p>
  </div>
);

const PainCard = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="rounded-3xl border border-stone-300 bg-white p-6">
    <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">{icon}</div>
    <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{text}</p>
  </div>
);

const PromiseCard = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="rounded-3xl border border-stone-300 bg-white p-6 shadow-sm">
    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">{icon}</div>
    <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{text}</p>
  </div>
);

const StepCard = ({ index, icon, title, text }: { index: string; icon: React.ReactNode; title: string; text: string }) => (
  <div className="rounded-3xl border border-stone-300 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs uppercase tracking-[0.2em] font-black text-slate-500">{index}</span>
      <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">{icon}</div>
    </div>
    <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{text}</p>
  </div>
);

const ConditionChip = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-semibold text-slate-700 flex items-center gap-2">
    <CheckCircle2 size={14} className="text-blue-600" />
    <span>{text}</span>
  </div>
);

const HistoryRow = ({ version, text }: { version: string; text: string }) => (
  <div className="rounded-xl border border-blue-200 bg-white px-4 py-3">
    <p className="text-xs uppercase tracking-wide font-black text-blue-700 mb-1">{version}</p>
    <p className="text-slate-700">{text}</p>
  </div>
);

const FaqCard = ({ q, a }: { q: string; a: string }) => (
  <div className="rounded-3xl border border-stone-300 bg-stone-50 p-6">
    <h3 className="text-lg font-black text-slate-900 mb-2">{q}</h3>
    <p className="text-slate-600 leading-relaxed">{a}</p>
  </div>
);

export default About;

