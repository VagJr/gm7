declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    GAME_ROOM_DO?: DurableObjectNamespace;
  }
}
