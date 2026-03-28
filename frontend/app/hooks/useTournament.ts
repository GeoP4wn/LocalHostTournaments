import { useNavigate } from "react-router"
import { useEffect, useState } from "react"

export function useTournament() {
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem("tournament")
    if (!stored) {
      navigate("/join")
      return
    }
    setTournament(JSON.parse(stored))
  }, [])

  const leave = () => {
    localStorage.removeItem("tournament")
    navigate("/join")
  }

  return { tournament, leave }
}