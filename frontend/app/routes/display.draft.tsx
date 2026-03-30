export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Display a Tournament", to: "/display/tournament" },
  ],
};

export default function Display()  {
    return(
        <div>
            <h1>Display the current Draft</h1>
        </div>
    );
}