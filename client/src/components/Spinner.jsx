// Small inline loading spinner used to show pending states on async actions (#16).
const Spinner = ({ size = 16, className = '' }) => (
  <span
    className={`spinner ${className}`}
    style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
    role="status"
    aria-label="Loading"
  />
);

export default Spinner;
