"use client";

export function OpportunityFilters() {
  return (
    <form
      action="/opportunities"
      className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      method="get"
    >
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Search
        <input
          className="min-h-11 rounded-md border border-slate-300 px-3 text-base font-normal text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          name="search"
          placeholder="Title, organization, or keyword"
          type="search"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Category
        <input
          className="min-h-11 rounded-md border border-slate-300 px-3 text-base font-normal text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          name="category"
          placeholder="Choose a category"
          type="text"
        />
      </label>
      <button
        className="min-h-11 rounded-md bg-emerald-700 px-5 font-medium text-white hover:bg-emerald-800"
        type="submit"
      >
        Search
      </button>
    </form>
  );
}
