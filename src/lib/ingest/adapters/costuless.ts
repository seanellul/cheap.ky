import { FreshopAdapter } from "./freshop-base";

export class CostULessAdapter extends FreshopAdapter {
  storeId = "costuless";
  protected appKey = "cost_u_less";
  protected freshopStoreId = "3821"; // Grand Cayman location
}
