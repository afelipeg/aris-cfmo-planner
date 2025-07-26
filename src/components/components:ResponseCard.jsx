function CRMResponse({ response }) {
  // Transforma el JSON en algo bonito
  return (
    <div className="crm-card">
      <h3>Segmentos RFM</h3>
      <table>
        <thead>
          <tr>
            <th>Segmento</th>
            <th>Tamaño</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {response.rfm_analysis.segments.map((segment, index) => (
            <tr key={index}>
              <td>{segment.segment}</td>
              <td>{segment.size}%</td>
              <td>${segment.ltv}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="viral-growth">
        <h4>Coeficiente Viral: 
          <span className="current">{response.viral_growth.current_k_factor}</span> → 
          <span className="target">{response.viral_growth.target_k_factor}</span>
        </h4>
      </div>
    </div>
  );
}