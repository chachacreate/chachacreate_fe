const Footer = () => {
  return (
    <footer style={{
      borderTop: "1px solid #eee",
      background: "#fafafa",
      padding: "16px",
      textAlign: "center",
      color: "#555"
    }}>
      © {new Date().getFullYear()} ChachaCreate
    </footer>
  );
};
export default Footer;
