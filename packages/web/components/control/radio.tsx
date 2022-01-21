import Image from "next/image";
import { FunctionComponent } from "react";
import classNames from "classnames";
import { Disableable, CustomClasses } from "./types";

interface Props extends Disableable, CustomClasses {
  /**
   * The value that will be emitted by this radio button.
   */
  value: string;
  onChange: (value: string) => void;
  /**
   * Current value of the broader radio group.
   */
  groupValue: string;
  /**
   * Identifier to specify which group this radio button is with.
   */
  groupName?: string;
}

/**
 * Example:
 * ```
 * const [r, setR] = useState("a");
 * <Radio value="a" onChange={setR} groupValue={r} disabled={disabled} />
 * <Radio value="b" onChange={setR} groupValue={r} disabled={disabled} />
 * <Radio value="c" onChange={setR} groupValue={r} disabled={disabled} />
 * ```
 */
export const Radio: FunctionComponent<Props> = ({
  value,
  onChange,
  disabled = false,
  groupValue,
  groupName = "radio",
  className,
}) => {
  const isOn = value === groupValue;

  return (
    <label htmlFor="toggle-radio">
      {isOn && (
        <div
          className={classNames(
            "cursor-pointer absolute z-50",
            disabled ? "cursor-default opacity-50" : null
          )}
        >
          <Image alt="" src="/icons/dot.svg" height={20} width={20} />
        </div>
      )}
      <input
        type="radio"
        className={classNames(
          "relative cursor-pointer h-5 w-5 appearance-none",
          "after:absolute after:h-5 after:w-5 after:rounded-full", // box
          disabled
            ? isOn
              ? "opacity-50 cursor-default checked:after:bg-iconDefault" // disabled AND on
              : "opacity-50 cursor-default after:border-2 after:border-iconDefault"
            : isOn
            ? "after:bg-primary-200" // not disabled AND on
            : "after:border-2 after:border-primary-200",
          className
        )}
        checked={isOn}
        disabled={disabled}
        name={groupName}
        value={value}
        onChange={(e) => onChange((e.target as unknown as any).value)}
      />
    </label>
  );
};
