function TextList({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="empty-detail">등록된 활동이 없습니다.</p>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function MaintenancePlan({ report }) {
  const plan = report?.maintenancePlan ?? {};
  const diagnosis = report?.diagnosis ?? {};
  const maintenanceItems = plan.maintenanceItems ?? plan.items ?? [];
  const extensionItems = plan.extensionItems ?? [];

  return (
    <div className="prescription-detail-list">
      <article className="prescription-card maintenance-plan">
        <h3>{plan.title ?? "유지·확장 계획"}</h3>
        {plan.summary ? <p>{plan.summary}</p> : null}

        <section>
          <h4>유지 활동</h4>
          <TextList items={maintenanceItems} />
        </section>

        <section>
          <h4>확장 활동</h4>
          <TextList items={extensionItems} />
        </section>

        {diagnosis.parentMessage ? (
          <section>
            <h4>학부모 안내</h4>
            <p>{diagnosis.parentMessage}</p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
