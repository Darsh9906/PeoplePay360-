import PayrunDetails from "@/src/pages/payroll/PayrunDetails"

export default async function PayrunDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  return <PayrunDetails id={resolvedParams.id} />
}
