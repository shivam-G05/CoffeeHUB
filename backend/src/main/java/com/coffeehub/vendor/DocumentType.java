package com.coffeehub.vendor;

public enum DocumentType {
    GST(true, "GST certificate"),
    PAN(true, "PAN card"),
    FSSAI(false, "FSSAI licence"),
    COMPANY_REGISTRATION(false, "company / LLP registration"),
    IEC(false, "Import Export Code (IEC)"),
    BANK_PROOF(true, "bank proof / cancelled cheque"),
    ADDRESS_PROOF(true, "address proof"),
    CERTIFICATION(false, "certification");

    private final boolean required;
    private final String label;

    DocumentType(boolean required, String label) {
        this.required = required;
        this.label = label;
    }

    /** Human-readable name used in messages to vendors, e.g. "GST certificate". */
    public String label() {
        return label;
    }

    /** Required for every vendor before they can submit for verification; the rest apply "where applicable". */
    public boolean required() {
        return required;
    }
}
