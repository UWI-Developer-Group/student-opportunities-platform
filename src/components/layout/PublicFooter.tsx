export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full  justify-center px-6 py-6 text-sm text-slate-600 sm:px-10">

        <div className="w-1/3 flex flex-col">
          <p className="font-semibold tracking-tight text-slate-950">Student Opportunities Network</p>
          <p>UWI Developer Group</p>
          <p>About</p>
          <p>Contact</p>
          <p>Blogs</p>
          <p>Listings</p>
          <p>Organizations</p>
          <p>Partners</p>
        </div>

        <div className="w-1/3 flex flex-col">
          <p className="font-semibold tracking-tight text-slate-950">Categories</p>
          <p>Volunteering</p>
          <p>Student Leadership</p>
          <p>Internships</p>
          <p>Job Postings</p>
          <p>International</p>
          <p>Creative Gigs</p>
        </div>

        <div className="flex flex-col">
          <p className="font-semibold tracking-tight text-slate-950">Connect</p>
          <p>Instagram</p>
          <p>LinkedIn</p>
          <p>TikTok</p>
          <p>WhatsApp</p>
          <p>Email</p>
        </div>
      </div>

      <div className="mx-auto flex w-full justify-center gap-8 px-6 py-6 sm:px-10">
        <p className="text-sm font-semibold tracking-tight text-slate-950">
          ©2026 UWI Developer Group. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}