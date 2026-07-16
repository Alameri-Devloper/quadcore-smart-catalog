"use client";

import type { ProductEntryDeviceClassOption } from "../../services/product-entry-device-class.service";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";

interface DeviceClassStepProps {
  deviceClasses: ProductEntryDeviceClassOption[];
  loadError: string | null;
  loading: boolean;
  onRetry: () => void;
}

export function DeviceClassStep({ deviceClasses, loadError, loading, onRetry }: DeviceClassStepProps) {
  const { setValue, validation, values } = useProductEntryWorkflow();
  const validationMessage = validation && !validation.valid
    ? validation.issues[0]?.message
    : null;

  const selectDeviceClass = (deviceClassId: string) => {
    if (values.deviceClassId === deviceClassId) return;
    void setValue("deviceClassId", deviceClassId);
  };

  return (
    <fieldset aria-describedby="device-class-help device-class-status">
      <legend className="text-2xl font-semibold tracking-tight text-slate-950">
        What type of device is this?
      </legend>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600" id="device-class-help">
        Choose the class that best describes how this product will be used.
      </p>

      <div aria-live="polite" id="device-class-status">
        {loading ? <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Loading device types...</p> : null}
        {loadError ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
            <p>{loadError}</p>
            <button className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200" onClick={onRetry} type="button">Try again</button>
          </div>
        ) : null}
        {!loading && !loadError && deviceClasses.length === 0 ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">No compatible device types are available.</p> : null}
      </div>

      {!loading && !loadError && deviceClasses.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {deviceClasses.map((deviceClass) => {
            const selected = values.deviceClassId === deviceClass.id;
            return (
              <label className={`relative flex min-h-36 cursor-pointer flex-col rounded-2xl border-2 p-5 transition focus-within:ring-4 focus-within:ring-blue-200 ${selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-400"}`} key={deviceClass.id}>
                <input checked={selected} className="absolute right-4 top-4 size-5 accent-blue-600" name="product-device-class" onChange={() => selectDeviceClass(deviceClass.id)} type="radio" value={deviceClass.id} />
                <span className="pr-8 text-base font-semibold text-slate-950">{deviceClass.name}</span>
                <span className="mt-2 text-sm leading-6 text-slate-600">{deviceClass.description}</span>
                <span className="mt-auto pt-4 text-xs font-semibold text-slate-700">{selected ? "Selected" : "Choose this device type"}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {validationMessage ? <p aria-live="polite" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900" role="alert">{validationMessage}</p> : null}
    </fieldset>
  );
}
