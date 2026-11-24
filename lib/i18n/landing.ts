import { ANNUAL_SAVING_PERCENT, PRICING, TRIAL_DAYS } from "../billing/plans";

export type Locale = "en" | "es";

const en = {
  nav: { how: "How it works", pricing: "Pricing", faq: "Questions", signIn: "Sign in", other: "Español", otherHref: "/es" },
  hero: {
    eyebrow: "Weekly meal planning, budget first",
    title: "A week of dinners that fits your grocery budget.",
    lead: "Tell us your weekly grocery budget. We plan the week, price the cart, and show you what you saved.",
    cta: "Plan my week",
    note: "First week free. No card needed.",
    chips: { cart: "Estimated cart", under: "under budget" },
  },
  strip: ["300+ recipes, priced per package", "Works offline in the store", "English & Spanish", "Shared live grocery list"],
  inside: {
    title: "The app itself",
    lead: "No stock mockups — this is Cartfull running on a phone.",
    shots: [
      { src: "/landing/plan.png", alt: "Weekly plan with an estimated cart total under budget", caption: "The week, planned to your number" },
      { src: "/landing/list.png", alt: "Grocery list grouped by aisle with prices", caption: "A priced list, sorted by aisle" },
      { src: "/landing/savings.png", alt: "Savings tracker showing money kept week by week", caption: "Savings you can see and share" },
      { src: "/landing/recipe.png", alt: "Recipe page with cost, time and nutrition per serving", caption: "Every recipe priced per serving" },
    ],
    features: [
      { title: "A list you can share live", body: "Send a link and someone else checks items off while you watch — no account needed on their side." },
      { title: "Cook mode with step timers", body: "Big-type steps, one screen at a time, timers that start themselves and ring when done." },
      { title: "Wine, bread, dish soap", body: "Add anything the meals didn't ask for. Extras count in the budget and ride on the shared list." },
      { title: "Nine diets, real exclusions", body: "Vegan, vegetarian, pescatarian, keto, gluten-free, dairy-free and more — plus allergens and dislikes." },
      { title: "Leftovers are a plan", body: "Mark a meal as leftovers and its ingredients leave the cart. The week adjusts instantly." },
      { title: "Receipts prove it", body: "Snap your receipt, enter what you really spent, and watch the running total stay honest." },
    ],
  },
  calc: {
    title: "See what a planned week could save you",
    people: "People at home",
    person: "person",
    persons: "people",
    spend: "What you spend on groceries each week",
    planned: "Planned week with Cartfull",
    monthly: "Estimated savings each month",
    yearly: "About {amount} a year.",
    lean: "You already shop lean. Cartfull keeps you there and does the planning for you.",
    footnote:
      "Estimate. A planned week covers dinners, lunches and breakfasts at typical discount-grocer prices, plus 25% for snacks, drinks and extras. Your results depend on your store and what you buy.",
    fewer: "Fewer people",
    more: "More people",
  },
  steps: {
    title: "Three steps, about two minutes",
    items: [
      { title: "Set your number", body: "Pick a weekly budget, how many you feed, and anything you won't eat. Tick off what's already in your kitchen." },
      { title: "Get the week", body: "Seven dinners chosen to share ingredients, so less goes to waste. Don't like one? Swap it and stay on budget." },
      { title: "Shop the list", body: "One list, sorted by aisle, priced item by item. Check things off in the store, even with no signal." },
    ],
  },
  sample: {
    title: "What a week looks like",
    lead: "Seven dinners for {people}, planned to a {budget} budget.",
    serving: "a serving",
    cart: "Estimated cart",
    under: "under budget",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  why: {
    title: "Built around the total, not the recipe",
    items: [
      { title: "Never over", body: "If a week can't be planned for your number, we say so and show the lowest that works. No surprise at the register." },
      { title: "Whole packages, real math", body: "You can't buy half a bag of rice. We price what you carry out of the store, then reuse the rest across the week." },
      { title: "What you have counts", body: "Mark food you already own and it comes off the cart. The same budget goes further." },
      { title: "Proof it's working", body: "Enter your receipt total each week. We keep a running count of what you kept against your usual spend." },
    ],
  },
  pricing: {
    title: "One plan. Less than a takeout coffee a week.",
    lead: "Save $1 a week and the yearly plan has paid for itself.",
    yearly: `Yearly · save ${ANNUAL_SAVING_PERCENT}%`,
    monthly: "Monthly",
    perYear: "/ year",
    perMonth: "/ month",
    yearlyNote: `That's ${PRICING.annual.perMonthLabel} a month, billed once a year.`,
    monthlyNote: "Billed every month. Switch to yearly any time.",
    cta: "Plan my week",
    terms: `Your first week is free, no card needed. After that, ${TRIAL_DAYS} days free, then {price}. Cancel any time.`,
    yearPrice: `${PRICING.annual.label} a year`,
    monthPrice: `${PRICING.monthly.label} a month`,
    includes: ["A new plan and priced list every week", "Swaps that stay on budget", "Pantry tracking", "Savings history"],
  },
  faq: {
    title: "Questions",
    items: [
      { q: "Where do the prices come from?", a: "They are estimates based on typical shelf prices at US discount grocers. They are not live prices from your store, so your receipt will differ. Enter what you really spent and your savings use the real number." },
      { q: "What if my budget is very tight?", a: "We plan to your number or tell you plainly that we can't, and show the lowest budget that works for your household. We never hand you a plan that costs more than you set." },
      { q: "Which diets do you support?", a: "No preference, vegetarian, keto and high-protein. You can also exclude common allergens and foods you don't like. Cartfull is not medical or nutrition advice; always read labels if you have an allergy." },
      { q: "Does it plan breakfast and lunch?", a: "Dinners are always planned. Turn on lunches and breakfasts if you want them: a few recipes, repeated through the week to keep the cart small." },
      { q: "Can I cancel?", a: `Any time, from your account. If you cancel during the ${TRIAL_DAYS}-day trial you pay nothing.` },
      { q: "Do I need to install anything?", a: "No. Cartfull runs in your phone's browser. Add it to your home screen and the grocery list opens even with no signal." },
    ],
  },
  closing: { title: "Next week's groceries, already figured out.", cta: "Plan my week" },
  footer: {
    disclaimer:
      "Prices are estimates and not a quote from any store. Cartfull does not provide medical, dietary or nutrition advice. Check ingredient labels for allergens.",
    terms: "Terms",
    privacy: "Privacy",
    rights: "Cartfull",
  },
};

export type LandingCopy = typeof en;

/** Replaces `{name}` placeholders in a copy string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

const es: LandingCopy = {
  nav: { how: "Cómo funciona", pricing: "Precios", faq: "Preguntas", signIn: "Entrar", other: "English", otherHref: "/" },
  hero: {
    eyebrow: "Menú semanal que parte de tu presupuesto",
    title: "Una semana de cenas que entra en tu presupuesto.",
    lead: "Dinos cuánto puedes gastar en el súper esta semana. Planificamos el menú, calculamos el carrito y te mostramos cuánto ahorraste.",
    cta: "Planificar mi semana",
    note: "Primera semana gratis. Sin tarjeta.",
    chips: { cart: "Carrito estimado", under: "por debajo" },
  },
  strip: ["Más de 300 recetas, con precio por paquete", "Funciona sin señal en el súper", "Español e inglés", "Lista compartida en vivo"],
  inside: {
    title: "La app, tal cual",
    lead: "Sin mockups de stock — esto es Cartfull corriendo en un teléfono.",
    shots: [
      { src: "/landing/plan.png", alt: "Plan semanal con total de carrito por debajo del presupuesto", caption: "La semana, ajustada a tu número" },
      { src: "/landing/list.png", alt: "Lista de compras ordenada por pasillo con precios", caption: "Una lista con precios, por pasillo" },
      { src: "/landing/savings.png", alt: "Ahorro acumulado semana a semana", caption: "Ahorro que se ve y se comparte" },
      { src: "/landing/recipe.png", alt: "Receta con costo, tiempo y nutrición por porción", caption: "Cada receta con precio por porción" },
    ],
    features: [
      { title: "Lista compartida en vivo", body: "Manda un link y otra persona tacha contigo en el súper — sin cuenta del otro lado." },
      { title: "Modo cocina con timers", body: "Pasos en letra grande, uno por pantalla, con timers que arrancan solos y suenan al terminar." },
      { title: "Vino, pan, jabón", body: "Agrega lo que las comidas no pidieron. Los extras cuentan en el presupuesto y van en la lista compartida." },
      { title: "Nueve dietas, exclusiones reales", body: "Vegana, vegetariana, pescatariana, keto, sin gluten, sin lácteos y más — más alérgenos y gustos." },
      { title: "Las sobras también planifican", body: "Marca una comida como sobras y sus ingredientes salen del carrito al instante." },
      { title: "El recibo manda", body: "Saca foto del recibo, anota lo que gastaste de verdad y el ahorro queda honesto." },
    ],
  },
  calc: {
    title: "Mira cuánto podrías ahorrar con una semana planificada",
    people: "Personas en casa",
    person: "persona",
    persons: "personas",
    spend: "Lo que gastas en el súper cada semana",
    planned: "Semana planificada con Cartfull",
    monthly: "Ahorro estimado por mes",
    yearly: "Unos {amount} al año.",
    lean: "Ya compras con cuidado. Cartfull te mantiene ahí y planifica por ti.",
    footnote:
      "Estimación. Una semana planificada cubre cenas, almuerzos y desayunos a precios típicos de supermercados de descuento, más 25% para snacks, bebidas y extras. Tu resultado depende de tu tienda y de lo que compres.",
    fewer: "Menos personas",
    more: "Más personas",
  },
  steps: {
    title: "Tres pasos, unos dos minutos",
    items: [
      { title: "Pon tu número", body: "Elige un presupuesto semanal, cuántos comen y qué no quieres comer. Marca lo que ya tienes en la cocina." },
      { title: "Recibe la semana", body: "Siete cenas elegidas para compartir ingredientes y que se desperdicie menos. ¿No te gusta una? Cámbiala sin pasarte." },
      { title: "Compra con la lista", body: "Una lista, ordenada por pasillo, con precio por producto. Táchalos en la tienda, incluso sin señal." },
    ],
  },
  sample: {
    title: "Así se ve una semana",
    lead: "Siete cenas para {people}, planificadas con un presupuesto de {budget}.",
    serving: "por porción",
    cart: "Carrito estimado",
    under: "por debajo del presupuesto",
    days: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  },
  why: {
    title: "Pensado para el total, no para la receta",
    items: [
      { title: "Nunca te pasas", body: "Si la semana no se puede planificar con tu número, te lo decimos y mostramos el mínimo que funciona. Sin sorpresas en la caja." },
      { title: "Paquetes enteros, cuentas reales", body: "No puedes comprar media bolsa de arroz. Calculamos lo que sale de la tienda y usamos el resto durante la semana." },
      { title: "Lo que tienes cuenta", body: "Marca lo que ya tienes y sale del carrito. El mismo presupuesto rinde más." },
      { title: "La prueba de que funciona", body: "Anota el total de tu recibo cada semana. Llevamos la cuenta de lo que ahorraste frente a tu gasto habitual." },
    ],
  },
  pricing: {
    title: "Un solo plan. Menos que un café por semana.",
    lead: "Con ahorrar $1 por semana, el plan anual ya se pagó solo.",
    yearly: `Anual · ahorra ${ANNUAL_SAVING_PERCENT}%`,
    monthly: "Mensual",
    perYear: "/ año",
    perMonth: "/ mes",
    yearlyNote: `Son ${PRICING.annual.perMonthLabel} al mes, en un solo pago anual.`,
    monthlyNote: "Se cobra cada mes. Cambia a anual cuando quieras.",
    cta: "Planificar mi semana",
    terms: `Tu primera semana es gratis, sin tarjeta. Después, ${TRIAL_DAYS} días gratis y luego {price}. Cancela cuando quieras.`,
    yearPrice: `${PRICING.annual.label} al año`,
    monthPrice: `${PRICING.monthly.label} al mes`,
    includes: ["Un plan nuevo con lista y precios cada semana", "Cambios que respetan el presupuesto", "Control de despensa", "Historial de ahorro"],
  },
  faq: {
    title: "Preguntas",
    items: [
      { q: "¿De dónde salen los precios?", a: "Son estimaciones basadas en precios típicos de supermercados de descuento en EE. UU. No son precios en vivo de tu tienda, así que tu recibo será distinto. Anota lo que gastaste y el ahorro usa el número real." },
      { q: "¿Y si mi presupuesto es muy ajustado?", a: "Planificamos con tu número o te decimos claramente que no alcanza, y mostramos el presupuesto mínimo para tu hogar. Nunca te damos un plan que cueste más de lo que pusiste." },
      { q: "¿Qué dietas tienen?", a: "Sin preferencia, vegetariana, keto y alta en proteína. También puedes excluir alérgenos comunes y comidas que no te gustan. Cartfull no es consejo médico ni nutricional; lee siempre las etiquetas si tienes una alergia." },
      { q: "¿Planifica desayuno y almuerzo?", a: "Las cenas siempre. Activa almuerzos y desayunos si los quieres: pocas recetas, repetidas en la semana para que el carrito sea chico." },
      { q: "¿Puedo cancelar?", a: `Cuando quieras, desde tu cuenta. Si cancelas durante los ${TRIAL_DAYS} días de prueba no pagas nada.` },
      { q: "¿Tengo que instalar algo?", a: "No. Cartfull funciona en el navegador de tu teléfono. Agrégalo a la pantalla de inicio y la lista se abre incluso sin señal." },
    ],
  },
  closing: { title: "El súper de la próxima semana, ya resuelto.", cta: "Planificar mi semana" },
  footer: {
    disclaimer:
      "Los precios son estimaciones y no una cotización de ninguna tienda. Cartfull no ofrece consejo médico, dietético ni nutricional. Revisa las etiquetas por alérgenos.",
    terms: "Términos",
    privacy: "Privacidad",
    rights: "Cartfull",
  },
};

export const LANDING: Record<Locale, LandingCopy> = { en, es };
