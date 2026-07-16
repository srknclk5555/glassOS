import Link from "next/link";

export default function MaterialList({ rows }: { rows: any[] }) {
  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Kod</th>
            <th style={{ textAlign: "left" }}>Ad</th>
            <th style={{ textAlign: "left" }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.materialCode}</td>
              <td>{r.name}</td>
              <td><Link href={`/materials/${r.id}`}>Detay</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
