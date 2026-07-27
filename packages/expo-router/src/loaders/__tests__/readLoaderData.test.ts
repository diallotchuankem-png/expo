import { LoaderClient } from '../LoaderClient';
import { readLoaderData } from '../readLoaderData';

const tick = () => Promise.resolve();

describe(readLoaderData, () => {
  it('fetches once, then reuses the value across re-renders', async () => {
    const client = new LoaderClient();
    const fetcher = jest.fn(async () => 'v1');

    const pending = readLoaderData(client, '/p', fetcher);
    expect(pending).toBeInstanceOf(Promise);
    await pending;

    for (let i = 0; i < 5; i++) {
      expect(readLoaderData(client, '/p', fetcher)).toBe('v1');
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('fetches again on a fresh mount after the Suspense entry is reclaimed', async () => {
    const client = new LoaderClient();
    const fetcher = jest
      .fn<Promise<string>, [string]>()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2');

    await readLoaderData(client, '/p', fetcher);
    expect(readLoaderData(client, '/p', fetcher)).toBe('v1');

    client.suspense.retain('/p');
    client.suspense.release('/p');
    await tick();
    expect(client.suspense.get('/p')).toBeUndefined();

    const revisit = readLoaderData(client, '/p', fetcher);
    expect(revisit).toBeInstanceOf(Promise);
    await expect(revisit).resolves.toBe('v2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves the settled value to a retry render that runs a task after settling', async () => {
    const client = new LoaderClient();
    const fetcher = jest.fn(async () => 'v1');

    // No reader has committed yet (retain() runs on commit), and React's Suspense retry render
    // can land a full task after the fetch settles. The entry must survive until that read.
    await readLoaderData(client, '/p', fetcher);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(readLoaderData(client, '/p', fetcher)).toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('fetches exactly once when Suspense replays a cache-miss mount', () => {
    const client = new LoaderClient();
    const fetcher = jest.fn(async () => 'v1');

    const first = readLoaderData(client, '/p', fetcher);
    const second = readLoaderData(client, '/p', fetcher);

    expect(first).toBeInstanceOf(Promise);
    expect(second).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('throws the settled error to replayed reads without refetching, then clears it so a retry refetches', async () => {
    const client = new LoaderClient();
    const fetcher = jest
      .fn<Promise<string>, [string]>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');

    await expect(readLoaderData(client, '/err', fetcher)).rejects.toThrow(
      'Failed to load loader data for route: /err'
    );
    expect(() => readLoaderData(client, '/err', fetcher)).toThrow(
      'Failed to load loader data for route: /err'
    );
    expect(fetcher).toHaveBeenCalledTimes(1);

    await tick();
    expect(client.suspense.get('/err')).toBeUndefined();

    const retry = readLoaderData(client, '/err', fetcher);
    expect(retry).toBeInstanceOf(Promise);
    await expect(retry).resolves.toBe('recovered');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not double-fetch across a StrictMode unmount + remount within the same tick', async () => {
    const client = new LoaderClient();
    const fetcher = jest.fn(async () => 'v1');

    await readLoaderData(client, '/sm', fetcher);
    client.suspense.retain('/sm');
    client.suspense.release('/sm');
    client.suspense.retain('/sm');
    await tick();

    expect(readLoaderData(client, '/sm', fetcher)).toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not re-seed a reclaimed entry when an abandoned fetch resolves', async () => {
    const client = new LoaderClient();
    let resolveFetch!: (value: string) => void;
    const fetcher = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const abandoned = readLoaderData(client, '/p', fetcher) as Promise<string>;
    client.suspense.retain('/p');
    client.suspense.release('/p');
    await tick();
    expect(client.suspense.get('/p')).toBeUndefined();

    resolveFetch('stale');
    await expect(abandoned).resolves.toBe('stale');
    expect(client.suspense.get('/p')).toBeUndefined();

    expect(readLoaderData(client, '/p', fetcher)).toBeInstanceOf(Promise);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not re-seed a reclaimed entry when an abandoned fetch rejects', async () => {
    const client = new LoaderClient();
    let rejectFetch!: (error: Error) => void;
    const fetcher = jest.fn(
      () =>
        new Promise<string>((_, reject) => {
          rejectFetch = reject;
        })
    );

    const abandoned = readLoaderData(client, '/err', fetcher) as Promise<string>;
    client.suspense.retain('/err');
    client.suspense.release('/err');
    await tick();
    expect(client.suspense.get('/err')).toBeUndefined();

    rejectFetch(new Error('boom'));
    await expect(abandoned).rejects.toThrow('Failed to load loader data for route: /err');
    expect(client.suspense.get('/err')).toBeUndefined();

    expect(readLoaderData(client, '/err', fetcher)).toBeInstanceOf(Promise);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not re-seed after invalidateAll when an in-flight fetch resolves', async () => {
    const client = new LoaderClient();
    let resolveFetch!: (value: string) => void;
    const fetcher = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const inFlight = readLoaderData(client, '/p', fetcher) as Promise<string>;
    client.invalidateAll();

    resolveFetch('pre-edit');
    await expect(inFlight).resolves.toBe('pre-edit');
    expect(client.suspense.get('/p')).toBeUndefined();
  });
});
