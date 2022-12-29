import {
  ObservableChainQueryMap,
  ChainGetter,
  ObservableChainQuery,
  QueryResponse,
} from "@keplr-wallet/stores";
import { KVStore } from "@keplr-wallet/common";
import { Gauge, GaugeById } from "./types";
import { action, computed, observable } from "mobx";
import { computedFn } from "mobx-utils";
import { AppCurrency } from "@keplr-wallet/types";
import { CoinPretty, Dec } from "@keplr-wallet/unit";
import { Duration } from "dayjs/plugin/duration";
import dayjs from "dayjs";

export class ObservableQueryGuageById extends ObservableChainQuery<GaugeById> {
  @observable.ref
  protected _raw?: Gauge;

  @observable
  protected _canFetch = false;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    id: string
  ) {
    super(
      kvStore,
      chainId,
      chainGetter,
      `/osmosis/incentives/v1beta1/gauge_by_id/${id}`
    );
  }

  static makeWithRaw(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    gauge: Gauge
  ) {
    const queryGauge = new ObservableQueryGuageById(
      kvStore,
      chainId,
      chainGetter,
      gauge.id
    );
    queryGauge.setRaw(gauge);
    queryGauge.allowFetch();
    return queryGauge;
  }

  @action
  allowFetch() {
    this._canFetch = true;
  }

  protected canFetch() {
    return this._canFetch;
  }

  @action
  setRaw(gauge: Gauge) {
    this._raw = gauge;
  }

  @computed
  get hasData() {
    return this._raw !== undefined;
  }

  protected setResponse(response: Readonly<QueryResponse<GaugeById>>) {
    super.setResponse(response);

    for (const coin of response.data.gauge.coins) {
      this.chainGetter.getChain(this.chainId).findCurrency(coin.denom);
    }

    this._raw = response.data.gauge;
  }

  get gauge() {
    return this._raw;
  }

  @computed
  get startTime(): Date {
    if (!this._raw) {
      return new Date(0);
    }

    return new Date(this._raw.start_time);
  }

  @computed
  get lockupDuration(): Duration {
    if (!this._raw) {
      return dayjs.duration({
        seconds: 0,
      });
    }

    if (this._raw.distribute_to.lock_query_type !== "ByDuration") {
      return dayjs.duration({
        seconds: 0,
      });
    }

    return dayjs.duration({
      seconds: parseInt(this._raw.distribute_to.duration.replace("s", "")),
    });
  }

  @computed
  get remainingEpoch(): number {
    if (!this._raw) {
      return 0;
    }

    return (
      parseInt(this._raw.num_epochs_paid_over) -
      parseInt(this._raw.filled_epochs)
    );
  }

  @computed
  get numEpochsPaidOver(): number {
    if (!this._raw) {
      return 0;
    }

    return parseInt(this._raw.num_epochs_paid_over);
  }

  readonly getCoin = computedFn((currency: AppCurrency): CoinPretty => {
    if (!this._raw) {
      return new CoinPretty(currency, new Dec(0));
    }

    const primitive = this._raw.coins.find(
      (coin) => coin.denom === currency.coinMinimalDenom
    );
    if (!primitive) {
      return new CoinPretty(currency, new Dec(0));
    }
    return new CoinPretty(currency, new Dec(primitive.amount));
  });

  readonly getDistributedCoin = computedFn(
    (currency: AppCurrency): CoinPretty => {
      if (!this._raw) {
        return new CoinPretty(currency, new Dec(0));
      }

      const primitive = this._raw.distributed_coins.find(
        (coin) => coin.denom === currency.coinMinimalDenom
      );
      if (!primitive) {
        return new CoinPretty(currency, new Dec(0));
      }
      return new CoinPretty(currency, new Dec(primitive.amount));
    }
  );

  readonly getRemainingCoin = computedFn(
    (currency: AppCurrency): CoinPretty => {
      return this.getCoin(currency).sub(this.getDistributedCoin(currency));
    }
  );
}

export class ObservableQueryGuage extends ObservableChainQueryMap<GaugeById> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, (id: string) => {
      return new ObservableQueryGuageById(kvStore, chainId, chainGetter, id);
    });
  }

  get(id: string): ObservableQueryGuageById {
    const gauge = super.get(id) as ObservableQueryGuageById;

    // If the requested gauge does not have data, fetch it.
    if (!gauge.hasData) {
      gauge.allowFetch();
      gauge.fetch();
    }

    return gauge;
  }

  /** Adds a gauge to the map store with prepopulated data. */
  @action
  setWithGauge(gauge: Gauge) {
    const queryGauge = ObservableQueryGuageById.makeWithRaw(
      this.kvStore,
      this.chainId,
      this.chainGetter,
      gauge
    );
    this.map.set(gauge.id, queryGauge);
  }
}
