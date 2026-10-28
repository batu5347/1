import React from "react";
import type { ShotProps } from "../BlackoutVideo";
import type { ShotId } from "../timeline";
import { Atm, CellTower, GasStation, Hospital, Apartments, Office, PhoneSignal } from "./Facades";
import { CityHook, CityReturn, CityWide } from "./Hook";
import { Checkout, ControlRoom, Elevator, Family, HospitalIcu, Subway, Supermarket } from "./Interior";
import { MapShot } from "./Map";
import { ClosedShops, Emergency, FlashlightCrowd, FlashlightWalk, Phones, Traffic } from "./Street";

export const SHOT_COMPONENTS: Record<ShotId, React.FC<ShotProps>> = {
  cityHook: CityHook,
  traffic: Traffic,
  subway: Subway,
  phones: Phones,
  office: Office,
  supermarket: Supermarket,
  checkout: Checkout,
  gasStation: GasStation,
  phoneSignal: PhoneSignal,
  atm: Atm,
  flashlightWalk: FlashlightWalk,
  elevator: Elevator,
  apartments: Apartments,
  cellTower: CellTower,
  hospital: Hospital,
  closedShops: ClosedShops,
  emergency: Emergency,
  family: Family,
  cityWide: CityWide,
  controlRoom: ControlRoom,
  hospitalIcu: HospitalIcu,
  flashlightCrowd: FlashlightCrowd,
  cityReturn: CityReturn,
  map: MapShot,
};
