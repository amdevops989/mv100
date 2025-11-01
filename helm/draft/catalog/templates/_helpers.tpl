{{- define "catalog.name" -}}
catalog
{{- end }}

{{- define "catalog.fullname" -}}
{{ .Release.Name }}
{{- end }}
