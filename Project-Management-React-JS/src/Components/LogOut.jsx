import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../supabaseClient";

export default function LogOut(props) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed!");
    } else {
      toast.success("Logout Success!");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    }
  };

  return (
    <button onClick={handleLogout} className="logout-button">
      <i className="uil uil-signout" />
      <span>Log Out</span>
    </button>
  );
}
