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
        Filter by Category
        <select
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-normal text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 appearance-none"
          name="category"
          defaultValue=""
        >
          <option value="">All</option>
          <option value="Internship">Internship</option>
          <option value="Student-Leadership">Student-Leadership</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Volunteer">Volunteer</option>
        </select>
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
