import { FreshopAdapter } from "./freshop-base";

export class FostersAdapter extends FreshopAdapter {
  storeId = "fosters";
  protected appKey = process.env.FRESHOP_APP_KEY || "fosters";
  protected freshopStoreId = process.env.FRESHOP_STORE_ID || "3747";
}
