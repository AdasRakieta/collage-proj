declare module 'node-fetch' {
  interface Response {
    ok: boolean;
    status: number;
    json(): Promise<any>;
    text(): Promise<string>;
  }
  function fetch(url: string, init?: any): Promise<Response>;
  export default fetch;
}
