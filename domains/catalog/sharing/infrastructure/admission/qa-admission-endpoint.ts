/** Guard before constructing any QA pool/socket, including test/fault entry points.
 * Reject pg connection query overrides rather than trusting WHATWG hostname alone. */
export function assertQaAdmissionEndpoint(value:string):URL {
 const url=new URL(value);
 if(url.search || url.hash || url.port!=="5432" || !["postgres:","postgresql:"].includes(url.protocol)
  || !["127.0.0.1","localhost","[::1]"].includes(url.hostname) || !/^\/qsc_p6_admission_test_[0-9_]+$/.test(url.pathname)) throw Error("UnsafeQaAdmissionEndpoint");
 return url;
}
