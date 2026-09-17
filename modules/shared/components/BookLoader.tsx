/**
 * The brand loading animation: a book whose pages keep turning. Pure CSS
 * (styles/ui.css), so it stays sharp at any size and costs no download.
 */
export function BookLoader({ label = "Loading…", size = 1 }: { label?: string; size?: number }) {
  return (
    <div className="kd-loader" role="status" aria-live="polite" style={{ "--kd-loader-scale": size } as React.CSSProperties}>
      <div className="kd-loader-stage" aria-hidden="true">
        <i className="kd-loader-spark s1" /><i className="kd-loader-spark s2" /><i className="kd-loader-spark s3" />
        <div className="kd-loader-book">
          <span className="kd-loader-cover left" />
          <span className="kd-loader-cover right" />
          <span className="kd-loader-sheet left" />
          <span className="kd-loader-sheet right" />
          <span className="kd-loader-page p1" />
          <span className="kd-loader-page p2" />
          <span className="kd-loader-page p3" />
        </div>
        <span className="kd-loader-shadow" />
      </div>
      <p className="kd-loader-label">{label}</p>
    </div>
  );
}
