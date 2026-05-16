import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from datetime import datetime
from database.mongo import get_all_predictions

def generate_pdf_report(output_path="crop_disease_report.pdf"):
    """
    Generates a PDF report summarizing crop disease predictions from MongoDB.
    """
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor("#1b5e20"),
        alignment=1, spaceAfter=20
    )
    heading_style = ParagraphStyle(
        'HeadingStyle', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor("#2e7d32"),
        spaceBefore=15, spaceAfter=10
    )
    normal_style = styles["Normal"]
    
    # Header
    elements.append(Paragraph("FASALAI — CROP DISEASE DETECTION REPORT", title_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    elements.append(Spacer(1, 20))
    
    # Fetch Data
    predictions = get_all_predictions()
    total_preds = len(predictions)
    high_risk = sum(1 for p in predictions if p.get("risk_level", "").lower() == "high")
    healthy = sum(1 for p in predictions if "healthy" in p.get("predicted_disease", "").lower())
    
    # Determine most common disease
    disease_counts = {}
    best_model_used = "EfficientNetB0" # Default
    
    for p in predictions:
        d = p.get("predicted_disease", "Unknown")
        disease_counts[d] = disease_counts.get(d, 0) + 1
        
    most_common = max(disease_counts, key=disease_counts.get) if disease_counts else "N/A"
    
    # Summary Section
    elements.append(Paragraph("<b>Summary Section</b>", heading_style))
    
    summary_data = [
        ["Total Predictions Made:", str(total_preds)],
        ["High Risk Detections:", str(high_risk)],
        ["Healthy Crops Detected:", str(healthy)],
        ["Most Common Disease Detected:", most_common],
        ["Best Model Used:", best_model_used]
    ]
    
    summary_table = Table(summary_data, colWidths=[200, 300])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#e8f5e9")),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor("#1b5e20")),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#c8e6c9"))
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Predictions List
    elements.append(Paragraph("<b>Detailed Prediction History</b>", heading_style))
    
    for idx, p in enumerate(predictions):
        elements.append(Paragraph(f"Prediction #{idx+1} - {p.get('timestamp', 'Unknown Time')}", styles["Heading3"]))
        
        weather = p.get("weather_data", {})
        weather_str = f"{weather.get('temperature', 'N/A')}°C, {weather.get('humidity', 'N/A')}% Humidity ({weather.get('condition', 'N/A')})"
        
        treatments = ", ".join(p.get("treatment_suggestions", []))
        if not treatments: treatments = "None"
        
        details = [
            ["Image Name:", p.get("image_name", "Unknown")],
            ["Predicted Disease:", p.get("predicted_disease", "Unknown")],
            ["Confidence:", f"{p.get('confidence', 0)}%"],
            ["Risk Level:", p.get("risk_level", "Unknown")],
            ["Weather:", weather_str],
            ["Model Used:", p.get("used_model", "Unknown")],
            ["Treatments:", treatments]
        ]
        
        details_table = Table(details, colWidths=[120, 380])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 6)
        ]))
        
        elements.append(details_table)
        elements.append(Spacer(1, 15))
        
    # Build Document
    doc.build(elements)
    return output_path
