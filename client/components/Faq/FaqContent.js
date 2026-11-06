export default function FaqContent() {
  return <section className="container app-main" id="main-content"><h1>Frequently asked questions</h1>
    <details><summary>Can I explore charts without an account?</summary><p>Yes. Explore displays public company charts, with synthetic demo data clearly labeled.</p></details>
    <details><summary>How do I import my own data?</summary><p>Create an account, log in, and open My data. Download the example CSV for the supported columns. Imports accept up to 1,000 rows in a file smaller than 1 MB.</p></details>
    <details><summary>Who can see my saved data?</summary><p>Saved rows are associated with your account. You can export or delete them from My data.</p></details>
  </section>;
}
